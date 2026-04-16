// netlify/functions/codes.js
// نظام الكودات: MR-XXXX-XXXX + INV-XXXX للدعوة الحصرية
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const ADMIN_PASSWORD = "Jwaijo249@jwaijo";

function generateCode(prefix = "MR") {
  const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand()}-${rand()}`;
}

function generateInviteCode() {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;

    // ═══ إنشاء كود بيع (أدمن) ═══
    if (action === "create_code") {
      const { password, name, phone, plan } = body;
      if (password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "كلمة سر خاطئة" }) };
      }

      const code = generateCode("MR");
      const inviteCode = plan === "duo" ? generateInviteCode() : null;
      const price = plan === "duo" ? 35 : 20;

      const codeData = {
        code,
        name: name || "",
        phone: phone || "",
        plan,
        price,
        inviteCode,
        invite_used: false,
        invite_user_name: null,
        main_progress: { stage: 1, answers: [], certificates: [], current_q: 0 },
        invited_progress: { stage: 1, answers: [], certificates: [], current_q: 0 },
        main_completed: false,
        invited_completed: false,
        created_at: new Date().toISOString()
      };

      await redis.set(`miraah:code:${code}`, JSON.stringify(codeData));

      if (inviteCode) {
        await redis.set(`miraah:invite:${inviteCode}`, JSON.stringify({
          parent_code: code,
          used: false,
          created_at: new Date().toISOString()
        }));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: { code, inviteCode, plan, price } })
      };
    }

    // ═══ التحقق من كود البيع ═══
    if (action === "verify_code") {
      const { code } = body;
      const raw = await redis.get(`miraah:code:${code}`);
      if (!raw) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "كود غير صحيح. تأكد من الكود أو تواصل مع فجر." }) };

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data }) };
    }

    // ═══ التحقق من كود الدعوة + ربطه باسم المدعو ═══
    if (action === "verify_invite") {
      const { inviteCode, inviteUserName } = body;
      const raw = await redis.get(`miraah:invite:${inviteCode}`);
      if (!raw) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "كود دعوة غير صحيح" }) };

      const inviteData = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (inviteData.used) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "هذا الكود استُخدم سابقاً. كل كود دعوة يفتح لصديق واحد فقط." }) };
      }

      // جلب بيانات الكود الرئيسي
      const mainRaw = await redis.get(`miraah:code:${inviteData.parent_code}`);
      if (!mainRaw) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "الكود الأصلي غير موجود" }) };

      const mainData = typeof mainRaw === "string" ? JSON.parse(mainRaw) : mainRaw;

      // تأكيد الاستخدام
      if (inviteUserName) {
        inviteData.used = true;
        inviteData.used_by = inviteUserName;
        inviteData.used_at = new Date().toISOString();
        mainData.invite_used = true;
        mainData.invite_user_name = inviteUserName;
        await redis.set(`miraah:invite:${inviteCode}`, JSON.stringify(inviteData));
        await redis.set(`miraah:code:${inviteData.parent_code}`, JSON.stringify(mainData));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, data: { parentCode: inviteData.parent_code, mainUserName: mainData.name } })
      };
    }

    // ═══ حفظ التقدم ═══
    if (action === "save_progress") {
      const { code, progress, isInvited } = body;
      const raw = await redis.get(`miraah:code:${code}`);
      if (!raw) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "كود غير صحيح" }) };

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (isInvited) {
        data.invited_progress = progress;
        if (progress.stage > 10) data.invited_completed = true;
      } else {
        data.main_progress = progress;
        if (progress.stage > 10) data.main_completed = true;
      }
      await redis.set(`miraah:code:${code}`, JSON.stringify(data));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ═══ جلب نتائج الشريك (عرض المقارنة) ═══
    if (action === "get_partner_results") {
      const { code, requesterIsInvited } = body;
      const raw = await redis.get(`miraah:code:${code}`);
      if (!raw) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "كود غير صحيح" }) };

      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const partnerProgress = requesterIsInvited ? data.main_progress : data.invited_progress;
      const partnerName = requesterIsInvited ? data.name : (data.invite_user_name || "الصديق");

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          data: {
            partner_name: partnerName,
            partner_stage: partnerProgress.stage,
            partner_certificates: partnerProgress.certificates,
            partner_completed: requesterIsInvited ? data.main_completed : data.invited_completed
          }
        })
      };
    }

    // ═══ قائمة كل الكودات (أدمن) ═══
    if (action === "list_codes") {
      const { password } = body;
      if (password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "كلمة سر خاطئة" }) };
      }

      const keys = await redis.keys("miraah:code:*");
      const codes = [];
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          const data = typeof raw === "string" ? JSON.parse(raw) : raw;
          codes.push(data);
        }
      }
      codes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data: codes }) };
    }

    // ═══ حذف كود (أدمن) ═══
    if (action === "delete_code") {
      const { password, code } = body;
      if (password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "كلمة سر خاطئة" }) };
      }
      const raw = await redis.get(`miraah:code:${code}`);
      if (raw) {
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (data.inviteCode) await redis.del(`miraah:invite:${data.inviteCode}`);
      }
      await redis.del(`miraah:code:${code}`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // ═══ إحصائيات ═══
    if (action === "stats") {
      const { password } = body;
      if (password !== ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "كلمة سر خاطئة" }) };
      }
      const keys = await redis.keys("miraah:code:*");
      let solo = 0, duo = 0, revenue = 0, completed_main = 0, completed_invited = 0, invited_accepted = 0;
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          const d = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (d.plan === "duo") { duo++; revenue += 35; } else { solo++; revenue += 20; }
          if (d.main_completed) completed_main++;
          if (d.invited_completed) completed_invited++;
          if (d.invite_used) invited_accepted++;
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          data: { total: keys.length, solo, duo, revenue, completed_main, completed_invited, invited_accepted }
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "إجراء غير معروف" }) };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || "خطأ داخلي" }) };
  }
}

/**
 * Live SMS Service for Central Coalfields Limited - DVMS
 * Supports:
 * 1. Fast2SMS (Recommended for Indian mobile numbers - instant OTP route)
 * 2. Twilio (Global SMS Gateway)
 * 3. Dev Fallback with secure console logging
 */

const sendOtpSms = async (mobile, otp) => {
  const cleanMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!cleanMobile || cleanMobile.length !== 10) {
    throw new Error('Valid 10-digit Indian mobile number is required.');
  }

  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  let carrierNotice = null;

  // 1. Try Fast2SMS if API key is provided
  if (fast2SmsKey && fast2SmsKey.trim() && fast2SmsKey !== 'your_fast2sms_api_key_here') {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: String(otp),
          numbers: cleanMobile
        })
      });

      const data = await response.json();
      if (data && data.return === true) {
        console.log(`[Fast2SMS Gateway] ✅ Live OTP SMS successfully delivered to +91-${cleanMobile}. Request ID: ${data.request_id || 'N/A'}`);
        return {
          delivered: true,
          provider: 'Fast2SMS',
          requestId: data.request_id,
          message: `Live SMS dispatched to +91-${cleanMobile}`
        };
      } else {
        carrierNotice = data?.message || 'Fast2SMS requires account verification';
        console.error(`[Fast2SMS Gateway] ❌ Fast2SMS returned error:`, data);
      }
    } catch (fastErr) {
      carrierNotice = fastErr.message;
      console.error(`[Fast2SMS Gateway] Network error dispatching SMS:`, fastErr.message);
    }
  }

  // 2. Try Twilio if configured
  if (twilioSid && twilioAuthToken && twilioPhoneNumber) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', `+91${cleanMobile}`);
      bodyParams.append('From', twilioPhoneNumber);
      bodyParams.append('Body', `CCL DVMS: Your official verification code is ${otp}. Valid for 10 minutes.`);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const data = await response.json();
      if (response.ok && data.sid) {
        console.log(`[Twilio Gateway] ✅ Live OTP SMS sent to +91-${cleanMobile}. SID: ${data.sid}`);
        return {
          delivered: true,
          provider: 'Twilio',
          sid: data.sid,
          message: `Live SMS dispatched to +91-${cleanMobile}`
        };
      } else {
        carrierNotice = data?.message || 'Twilio verification failed';
        console.error(`[Twilio Gateway] ❌ Twilio Error:`, data.message);
      }
    } catch (twErr) {
      carrierNotice = twErr.message;
      console.error(`[Twilio Gateway] Network error:`, twErr.message);
    }
  }

  // 3. Fallback / Dev logger (informs user how to activate live carrier delivery)
  console.log(`----------------------------------------------------------------`);
  console.log(`[Live SMS Dispatcher] Destination: +91-${cleanMobile}`);
  console.log(`[Live SMS Dispatcher] OTP Code: ${otp}`);
  if (carrierNotice) {
    console.log(`[Live SMS Dispatcher] Notice: ${carrierNotice}`);
  }
  console.log(`----------------------------------------------------------------`);

  return {
    delivered: false,
    provider: fast2SmsKey ? 'Fast2SMS (Simulated)' : 'Simulated',
    carrierNotice,
    cleanMobile,
    otp
  };
};

module.exports = {
  sendOtpSms
};

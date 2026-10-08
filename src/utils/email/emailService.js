const nodemailer = require('nodemailer');

class EmailService {
  /**
   * Create configured Nodemailer transporter
   */
  static getTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (user && pass) {
      if (process.env.EMAIL_SERVICE) {
        return nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: { user, pass }
        });
      }

      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    return null;
  }

  /**
   * Send 6-Digit Email Verification Code with Luxury ÉLAN Template
   */
  static async sendVerificationOTP({ to, name = 'Valued Guest', otp }) {
    const transporter = this.getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"ÉLAN Maison" <noreply@elanfragrance.com>';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 4px; overflow: hidden; }
          .header { background-color: #03204E; padding: 32px 24px; text-align: center; }
          .header h1 { color: #FFFFFF; font-size: 24px; letter-spacing: 4px; text-transform: uppercase; margin: 0; font-family: 'Georgia', serif; }
          .header p { color: #94A3B8; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
          .content { padding: 36px 30px; color: #334155; line-height: 1.6; text-align: center; }
          .greeting { font-size: 16px; font-weight: 600; color: #03204E; margin-bottom: 12px; }
          .intro { font-size: 13px; color: #64748B; margin-bottom: 24px; }
          .otp-card { background-color: #F1F5F9; border: 1px dashed #03204E; border-radius: 4px; padding: 20px; display: inline-block; margin: 10px 0 24px 0; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #03204E; font-family: monospace; }
          .expiry { font-size: 11px; color: #64748B; margin-top: 6px; }
          .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 11px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>ÉLAN</h1>
            <p>Haute Parfumerie • Cairo</p>
          </div>
          <div class="content">
            <div class="greeting">Dear ${name},</div>
            <p class="intro">Thank you for joining the ÉLAN Maison. Please use the verification code below to confirm your account:</p>
            
            <div class="otp-card">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Valid for 10 minutes</div>
            </div>

            <p style="font-size: 12px; color: #64748B; margin: 0;">If you did not request this verification code, please disregard this email.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} ÉLAN Fragrance House. All Rights Reserved.</p>
            <p style="margin: 4px 0 0 0; font-style: italic;">Leave your mark.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      console.log('\n==================================================');
      console.log(`[EMAIL SERVICE] (Simulated - No SMTP Configured)`);
      console.log(`To: ${to} (${name})`);
      console.log(`Subject: Your ÉLAN Verification Code`);
      console.log(`OTP CODE: >>> ${otp} <<<`);
      console.log('==================================================\n');
      return { success: true, simulated: true, otp };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `${otp} is your ÉLAN account verification code`,
        html: htmlContent,
        text: `Dear ${name},\n\nYour ÉLAN account verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nÉLAN Fine Fragrances`
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EMAIL SERVICE ERROR]:', error);
      // Fallback log for development
      console.log(`[FALLBACK OTP CODE FOR ${to}]: ${otp}`);
      return { success: false, error: error.message, fallbackOtp: otp };
    }
  }

  /**
   * Send Order Confirmation / Verification Email
   */
  static async sendOrderConfirmation({ to, name = 'Valued Customer', orderNumber, total, items = [], deliveryMethod, shippingAddress, trackingUrl }) {
    const transporter = this.getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"ÉLAN Maison" <orders@elanfragrance.com>';

    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 12px 0; font-weight: 500; color: #03204E;">${item.productName || 'Fragrance'} (${item.size || ''})</td>
        <td style="padding: 12px 0; text-align: center; color: #64748B;">x${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #03204E;">${(item.price * item.quantity).toLocaleString()} EGP</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; }
          .wrapper { max-width: 580px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
          .header { background-color: #03204E; padding: 32px 24px; text-align: center; }
          .header h1 { color: #FFFFFF; font-size: 26px; letter-spacing: 5px; text-transform: uppercase; margin: 0; font-family: 'Georgia', serif; }
          .header p { color: #94A3B8; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
          .content { padding: 32px 28px; color: #334155; line-height: 1.6; }
          .title { font-size: 18px; font-weight: 700; color: #03204E; margin-bottom: 8px; }
          .order-num { display: inline-block; background: #EEF2F6; color: #03204E; font-weight: bold; padding: 6px 14px; border-radius: 6px; font-family: monospace; font-size: 14px; margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
          .total-box { background-color: #F8FAFC; border-radius: 6px; padding: 16px; margin-top: 20px; text-align: right; }
          .total-amount { font-size: 20px; font-weight: 800; color: #03204E; }
          .btn { display: inline-block; background-color: #03204E; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 24px; text-align: center; }
          .footer { background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center; font-size: 11px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>ÉLAN</h1>
            <p>Haute Parfumerie • Cairo</p>
          </div>
          <div class="content">
            <div class="title">Order Confirmed & Verified</div>
            <p>Dear ${name},</p>
            <p>We are delighted to confirm that your order has been received and verified. Our master perfumers and fulfillment team are now preparing your selection with utmost care.</p>
            
            <div class="order-num">Order Reference: ${orderNumber}</div>

            <table class="table">
              <thead>
                <tr style="border-bottom: 2px solid #CBD5E1; color: #64748B; font-size: 12px; text-transform: uppercase; text-align: left;">
                  <th style="padding-bottom: 8px;">Item</th>
                  <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                  <th style="padding-bottom: 8px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total-box">
              <span style="font-size: 13px; color: #64748B;">Total Amount Paid / Due: </span>
              <span class="total-amount">${total?.toLocaleString()} EGP</span>
            </div>

            ${trackingUrl ? `<div style="text-align: center;"><a href="${trackingUrl}" class="btn">Track Your Order</a></div>` : ''}
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} ÉLAN Fragrance House. All Rights Reserved.</p>
            <p style="margin: 4px 0 0 0; font-style: italic;">Leave your mark.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!transporter) {
      console.log(`[EMAIL SERVICE] (Simulated) Order Confirmation sent to ${to} for Order ${orderNumber}`);
      return { success: true, simulated: true };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject: `Your ÉLAN Order ${orderNumber} is Confirmed`,
        html: htmlContent,
        text: `Dear ${name},\n\nYour order ${orderNumber} has been verified and is being prepared.\nTotal: ${total} EGP\n\nThank you for choosing ÉLAN.`
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EMAIL SERVICE ORDER CONFIRM ERROR]:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;

import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create and configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.GMAIL_PASSKEY, 
  },
});

// Helper function to send a message via Telegram
async function sendTelegramMessage(token, chat_id, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      text: message,
      chat_id,
    });
    return res.data.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
};

// HTML email template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Helper function to send an email via Nodemailer
async function sendEmail(payload, message) {
  const { name, email, message: userMessage } = payload;
  
  const mailOptions = {
    from: "Portfolio <portfolio@example.com>", 
    to: process.env.EMAIL_ADDRESS, 
    subject: `New Message From ${name}`, 
    text: message, 
    html: generateEmailTemplate(name, email, userMessage), 
    replyTo: email, 
  };
  
  try {
    console.log('=== EMAIL DEBUG ===');
    console.log('To:', process.env.EMAIL_ADDRESS || 'MISSING');
    console.log('GMAIL_PASSKEY set:', !!process.env.GMAIL_PASSKEY);
    await transporter.sendMail(mailOptions);
    console.log('Email SENT SUCCESS');
    return true;
  } catch (error) {
    console.error('EMAIL ERROR:', error.code || error.message);
    console.error('Full error:', error);
    return false;
  }
};

export async function POST(request) {
  console.log('Contact form submitted');
  try {
    const payload = await request.json();
    console.log('Form data:', JSON.stringify(payload, null, 2));
    const { name, email, message: userMessage } = payload;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;

    const message = `New message from ${name}

Email: ${email}

Message:
${userMessage}`;

    let telegramSuccess = true;
    if (token && chat_id) {
      telegramSuccess = await sendTelegramMessage(token, chat_id, message);
    } else {
      console.log('Telegram skipped - vars missing');
    }

    const emailSuccess = await sendEmail(payload, message);

    const responseMsg = telegramSuccess && emailSuccess ? 'All sent!' : 
      emailSuccess ? 'Email sent (Telegram skipped)' : 
      'Email failed';

    return NextResponse.json({
      success: emailSuccess,
      message: responseMsg,
    }, { status: emailSuccess ? 200 : 500 });
  } catch (error) {
    console.error('POST ERROR:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
    }, { status: 500 });
  }
};


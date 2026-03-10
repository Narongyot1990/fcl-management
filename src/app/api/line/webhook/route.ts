import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Client } from '@line/bot-sdk';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Create LINE client
const client = new Client(config);

// Verify LINE signature
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !config.channelSecret) return false;
  
  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body, 'utf8')
    .digest('base64');
  
  return hash === signature;
}

// Handle text message
async function handleTextMessage(event: any) {
  const { replyToken, message, source } = event;
  const userMessage = message.text.toLowerCase();
  
  let replyText = '';
  
  // Basic commands
  if (userMessage.includes('สวัสดี') || userMessage.includes('hello')) {
    replyText = 'สวัสดีครับ! 🚚\n\nฉันคือระบบจัดการรถขนส่ง FCL Management System\n\nคำสั่งที่ใช้ได้:\n• "สถานะรถ" - ดูสถานะรถทั้งหมด\n• "gps" - ดูตำแหน่งรถล่าสุด\n• "ช่วยเหลือ" - ดูคำสั่งทั้งหมด';
  } 
  else if (userMessage.includes('สถานะรถ') || userMessage.includes('status')) {
    replyText = '📊 สถานะรถขนส่ง (ณ ปัจจุบัน)\n\nกำลังพัฒนาฟีเจอร์นี้ครับ... 🔧\n\nสามารถดูรายละเอียดได้ที่ Dashboard';
  }
  else if (userMessage.includes('gps') || userMessage.includes('ตำแหน่ง')) {
    replyText = '📍 ตำแหน่งรถล่าสุด\n\nกำลังพัฒนาฟีเจอร์นี้ครับ... 🔧\n\nสามารถดูตำแหน่งแบบ real-time ได้ที่ Vendor Page';
  }
  else if (userMessage.includes('ช่วยเหลือ') || userMessage.includes('help')) {
    replyText = '🤖 คำสั่งที่ใช้ได้:\n\n• "สวัสดี" - ทักทาย\n• "สถานะรถ" - ดูสถานะรถทั้งหมด\n• "gps" - ดูตำแหน่งรถล่าสุด\n• "ช่วยเหลือ" - ดูคำสั่งทั้งหมด\n\n📞 ติดต่อผู้ดูแลระบบหากต้องการความช่วยเหลือเพิ่มเติม';
  }
  else {
    replyText = `🤔 ไม่เข้าใจคำสั่ง "${message.text}"\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมดครับ`;
  }
  
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: replyText,
    });
  } catch (error) {
    console.error('Error replying to message:', error);
  }
}

// Handle different message types
async function handleEvent(event: any) {
  // 🔴 BOT DISABLED - No responses
  console.log('Bot disabled - ignoring event:', event.type);
  return;
  
  switch (event.type) {
    case 'message':
      if (event.message.type === 'text') {
        await handleTextMessage(event);
      }
      break;
    
    case 'follow':
      // User added the bot
      try {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! 🚚\n\nยินดีต้อนรับสู่ FCL Management System\n\nพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งทั้งหมดครับ',
        });
      } catch (error) {
        console.error('Error handling follow event:', error);
      }
      break;
    
    case 'unfollow':
      // User removed the bot
      console.log('User unfollowed:', event.source);
      break;
      
    default:
      console.log('Unhandled event type:', event.type);
  }
}

// Main webhook handler
export async function POST(req: NextRequest) {
  try {
    // DEBUG: Log all requests
    console.log('=== LINE Webhook Debug ===');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    // Get request body
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');
    
    console.log('Body length:', body.length);
    console.log('Signature:', signature ? 'present' : 'missing');
    console.log('Body preview:', body.substring(0, 200) + '...');
    
    // Verify signature (important for security)
    if (!verifySignature(body, signature)) {
      console.error('Invalid LINE signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    // Parse webhook data
    const data = JSON.parse(body);
    const events = data.events || [];
    
    // Process each event
    for (const event of events) {
      await handleEvent(event);
    }
    
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('LINE Webhook Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for testing webhook
export async function GET() {
  return NextResponse.json({
    message: 'LINE Webhook API',
    status: 'running',
    endpoint: '/api/line/webhook',
    timestamp: new Date().toISOString(),
  });
}

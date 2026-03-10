# LINE Bot Setup Guide

## 1. สร้าง LINE Official Account

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. Login ด้วย LINE account
3. สร้าง Provider (ถ้ายังไม่มี)
4. สร้าง LINE Official Account (OA)
5. เลือก "Messaging API"

## 2. ตั้งค่า Environment Variables

เพิ่มข้อมูลนี้ใน `.env` หรือ Vercel Environment Variables:

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
```

### วิธีรับค่า:
- **Channel Access Token**: LINE Developers Console → Your OA → Messaging API → Channel access token
- **Channel Secret**: LINE Developers Console → Your OA → Basic settings

## 3. Webhook Configuration

### ใน LINE Developers Console:
1. ไปที่ Messaging API → Webhook settings
2. เปิด Use webhook
3. ตั้งค่า Webhook URL:
   ```
   https://your-app.vercel.app/api/line/webhook
   ```
4. กด Verify เพื่อตรวจสอบ

### ใน Vercel (หลัง deploy):
1. ไปที่ Project Settings → Environment Variables
2. เพิ่ม LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET
3. Redeploy project

## 4. ทดสอบ LINE Bot

### ทดสอบผ่าน Admin Panel:
1. ไปที่ `/line` ใน dashboard
2. ใส่ LINE User ID ที่ต้องการทดสอบ
3. ส่งข้อความทดสอบ

### ทดสอบผ่าน LINE:
1. เพิ่ม LINE Official Account เป็นเพื่อน
2. พิมพ์คำสั่ง:
   - `สวัสดี` - ทักทาย
   - `สถานะรถ` - ดูสถานะรถ
   - `gps` - ดูตำแหน่งรถ
   - `ช่วยเหลือ` - ดูคำสั่งทั้งหมด

## 5. ใช้งานใน Project

### ส่งข้อความจาก Backend:
```typescript
import { LineNotificationService } from '@/services/lineService';

// ส่งแจ้งเตือน GPS
await LineNotificationService.notifyGpsUpdate(
  userId, 
  'กข-1234', 
  'CPO Chonburi', 
  'https://maps.google.com/?q=13.568633,100.90025'
);

// ส่งแจ้งเตือน Booking
await LineNotificationService.notifyBookingUpdate(
  userId,
  'BK001',
  'completed',
  'ABC Transport'
);
```

### จัดการ User ID:
```typescript
// บันทึก LINE User ID ของผู้ใช้
LineNotificationService.registerUserLineId('user123', 'Uxxxxxxxxxxxxxx');

// ส่งข้อความถึงผู้ใช้
await LineNotificationService.notifyUser('user123', 'ข้อความของคุณ');
```

## 6. ฟีเจอร์ที่รองรับ

- ✅ รับข้อความจากผู้ใช้
- ✅ ตอบกลับข้อความอัตโนมัติ
- ✅ แจ้งเตือน GPS
- ✅ แจ้งเตือน Booking
- ✅ ส่งข้อความแบบ Broadcast
- 🚧 แจ้งเตือนระบบ
- 🚧 Daily summary

## 7. Security Notes

- Webhook signature verification ถูกเปิดใช้งานแล้ว
- Environment variables ควรเก็บเป็นความลับ
- ควรตรวจสอบ LINE User ID ก่อนบันทึก

## 8. Troubleshooting

### Webhook ไม่ทำงาน:
1. ตรวจสอบ Webhook URL ใน LINE Console
2. ตรวจสอบ Environment Variables ใน Vercel
3. ตรวจสอบว่า Vercel deploy ใหม่แล้ว

### ส่งข้อความไม่ได้:
1. ตรวจสอบ Channel Access Token
2. ตรวจสอบว่า User ID ถูกต้อง (ขึ้นต้นด้วย U)
3. ดู Vercel function logs

### ต้องการความช่วยเหลือเพิ่มเติม:
- ดู LINE Developers Documentation
- ตรวจสอบ Vercel logs ใน dashboard
- ทดสอบผ่าน LINE Admin Panel ที่ `/line`

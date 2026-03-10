import { Client, Message } from '@line/bot-sdk';

// LINE Bot configuration
export const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

// Create LINE client
export const lineClient = new Client(lineConfig);

// Send message to specific user
export async function sendLineMessage(userId: string, text: string) {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text,
    });
    return true;
  } catch (error) {
    console.error('Error sending LINE message:', error);
    return false;
  }
}

// Send rich message with formatting
export async function sendFormattedMessage(userId: string, title: string, content: string) {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `${title}\n\n${content}`,
    });
    return true;
  } catch (error) {
    console.error('Error sending formatted message:', error);
    return false;
  }
}

// Send GPS location notification
export async function sendGpsNotification(userId: string, truckPlate: string, location: string, mapsUrl: string) {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `📍 ตำแหน่งรถล่าสุด\n\n🚛 ทะเบียน: ${truckPlate}\n📍 สถานที่: ${location}\n\n🗺️ ดูแผนที่: ${mapsUrl}`,
    });
    return true;
  } catch (error) {
    console.error('Error sending GPS notification:', error);
    return false;
  }
}

// Send booking notification
export async function sendBookingNotification(userId: string, bookingId: string, status: string, vendor: string) {
  try {
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `📋 อัพเดทสถานะการจอง\n\n🆔 รหัส: ${bookingId}\n🏢 Vendor: ${vendor}\n📊 สถานะ: ${status}\n\nตรวจสอบรายละเอียดได้ที่ Dashboard`,
    });
    return true;
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return false;
  }
}

// Send alert message
export async function sendAlertMessage(userId: string, alertType: string, message: string) {
  try {
    const icons = {
      warning: '⚠️',
      error: '❌',
      success: '✅',
      info: 'ℹ️',
    };
    
    const icon = icons[alertType as keyof typeof icons] || 'ℹ️';
    
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: `${icon} ${alertType.toUpperCase()}\n\n${message}`,
    });
    return true;
  } catch (error) {
    console.error('Error sending alert message:', error);
    return false;
  }
}

// Verify LINE user ID format
export function isValidLineUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.startsWith('U') && userId.length > 10;
}

// Types for LINE integration
export interface LineUser {
  id: string;
  displayName?: string;
  pictureUrl?: string;
}

export interface LineNotification {
  userId: string;
  type: 'gps' | 'booking' | 'alert' | 'general';
  title: string;
  message: string;
  data?: any;
}

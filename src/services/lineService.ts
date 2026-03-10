import { sendLineMessage, sendGpsNotification, sendBookingNotification, sendAlertMessage } from '@/lib/lineUtils';

export class LineNotificationService {
  // Store user LINE IDs (in real app, this would be in database)
  private static userLineIds: Map<string, string> = new Map(); // userId -> lineId
  
  // Register user's LINE ID
  static registerUserLineId(userId: string, lineId: string) {
    this.userLineIds.set(userId, lineId);
  }
  
  // Get user's LINE ID
  static getUserLineId(userId: string): string | undefined {
    return this.userLineIds.get(userId);
  }
  
  // Send notification to specific user
  static async notifyUser(userId: string, message: string) {
    const lineId = this.getUserLineId(userId);
    if (!lineId) {
      console.log(`No LINE ID found for user: ${userId}`);
      return false;
    }
    
    return await sendLineMessage(lineId, message);
  }
  
  // Send GPS location update
  static async notifyGpsUpdate(userId: string, truckPlate: string, location: string, mapsUrl: string) {
    const lineId = this.getUserLineId(userId);
    if (!lineId) return false;
    
    return await sendGpsNotification(lineId, truckPlate, location, mapsUrl);
  }
  
  // Send booking status update
  static async notifyBookingUpdate(userId: string, bookingId: string, status: string, vendor: string) {
    const lineId = this.getUserLineId(userId);
    if (!lineId) return false;
    
    return await sendBookingNotification(lineId, bookingId, status, vendor);
  }
  
  // Send system alert
  static async sendAlert(userId: string, alertType: 'warning' | 'error' | 'success' | 'info', message: string) {
    const lineId = this.getUserLineId(userId);
    if (!lineId) return false;
    
    return await sendAlertMessage(lineId, alertType, message);
  }
  
  // Broadcast message to all users
  static async broadcast(message: string) {
    const promises = Array.from(this.userLineIds.values()).map(lineId => 
      sendLineMessage(lineId, message)
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Broadcast completed: ${successful} sent, ${failed} failed`);
    return { successful, failed };
  }
  
  // Example: Send daily summary
  static async sendDailySummary(userId: string, stats: {
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    activeTrucks: number;
  }) {
    const message = `📊 Daily Summary - ${new Date().toLocaleDateString('th-TH')}\n\n` +
      `📋 การจองทั้งหมด: ${stats.totalBookings}\n` +
      `✅ ดำเนินการแล้ว: ${stats.completedBookings}\n` +
      `⏳ รอดำเนินการ: ${stats.pendingBookings}\n` +
      `🚛 รถที่ใช้งาน: ${stats.activeTrucks}\n\n` +
      `ตรวจสอบรายละเอียดได้ที่ Dashboard`;
    
    return await this.notifyUser(userId, message);
  }
  
  // Example: Send truck arrival notification
  static async notifyTruckArrival(userId: string, truckPlate: string, location: string, bookingId: string) {
    const message = `🚛 รถถึงจุดหมายแล้ว!\n\n` +
      `📋 การจอง: ${bookingId}\n` +
      `🚛 ทะเบียน: ${truckPlate}\n` +
      `📍 สถานที่: ${location}\n\n` +
      `กรุณาตรวจสอบสินค้าและดำเนินการต่อไป`;
    
    return await this.notifyUser(userId, message);
  }
  
  // Example: Send system maintenance notice
  static async sendMaintenanceNotice(hours: number) {
    const message = `🔧 แจ้งปิดปรับปรุงระบบ\n\n` +
      `ระบบจะปิดปรับปรุงในอีก ${hours} ชั่วโมง\n` +
      `ระยะเวลาโดยประมาณ: 2 ชั่วโมง\n\n` +
      `กรุณาบันทึกข้อมูลที่สำคัญก่อนปิดระบบ\n` +
      `ขออภัยในความไม่สะดวก`;
    
    return await this.broadcast(message);
  }
}

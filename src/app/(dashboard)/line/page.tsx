"use client";
import { useState, useEffect } from "react";
import { Send, Users, Settings, CheckCircle, AlertCircle, Info } from "lucide-react";
import { LineNotificationService } from "@/services/lineService";
import PageHeader from "@/components/PageHeader";

export default function LinePage() {
  const [message, setMessage] = useState("");
  const [testUserId, setTestUserId] = useState("U"); // Default LINE user ID format
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Test webhook endpoint
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  useEffect(() => {
    checkWebhookStatus();
  }, []);

  async function checkWebhookStatus() {
    try {
      const response = await fetch('/api/line/webhook');
      if (response.ok) {
        setWebhookStatus('online');
      } else {
        setWebhookStatus('offline');
      }
    } catch (error) {
      setWebhookStatus('offline');
    }
  }

  async function handleSendTestMessage() {
    if (!testUserId || !testUserId.startsWith('U') || testUserId.length < 10) {
      setResult({ type: 'error', message: 'กรุณากรอก LINE User ID ให้ถูกต้อง (ขึ้นต้นด้วย U)' });
      return;
    }

    if (!message.trim()) {
      setResult({ type: 'error', message: 'กรุณากรอกข้อความ' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/line/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          userId: testUserId,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        setResult({ type: 'success', message: 'ส่งข้อความทดสอบสำเร็จ! ตรวจสอบ LINE ของคุณ' });
        setMessage('');
      } else {
        const error = await response.json();
        setResult({ type: 'error', message: error.error || 'ส่งข้อความไม่สำเร็จ' });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setLoading(false);
    }
  }

  async function handleBroadcastMessage() {
    if (!message.trim()) {
      setResult({ type: 'error', message: 'กรุณากรอกข้อความ' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // In real implementation, this would call LineNotificationService.broadcast
      setResult({ type: 'info', message: 'ฟีเจอร์ Broadcast ยังไม่เปิดใช้งาน' });
    } catch (error) {
      setResult({ type: 'error', message: 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader title="LINE Bot Management" subtitle="จัดการและทดสอบระบบ LINE Messaging" />

      {/* Webhook Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings size={20} className="text-slate-600" />
          สถานะ Webhook
        </h3>
        
        <div className="flex items-center gap-3">
          {webhookStatus === 'checking' && (
            <>
              <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
              <span className="text-slate-600">กำลังตรวจสอบ...</span>
            </>
          )}
          {webhookStatus === 'online' && (
            <>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-green-600 font-medium">Webhook Online</span>
              <span className="text-slate-400 text-sm">/api/line/webhook</span>
            </>
          )}
          {webhookStatus === 'offline' && (
            <>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-red-600 font-medium">Webhook Offline</span>
              <button 
                onClick={checkWebhookStatus}
                className="text-sm text-blue-600 hover:text-blue-700 ml-2"
              >
                ลองใหม่
              </button>
            </>
          )}
        </div>
      </div>

      {/* Send Test Message */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send size={20} className="text-slate-600" />
          ส่งข้อความทดสอบ
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              LINE User ID
            </label>
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxx..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              รับ LINE User ID จาก LINE Developers Console หรือจาก webhook event
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              ข้อความ
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="พิมพ์ข้อความทดสอบ..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSendTestMessage}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send size={16} />
                  ส่งข้อความทดสอบ
                </>
              )}
            </button>

            <button
              onClick={handleBroadcastMessage}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Users size={16} />
              Broadcast (ทุกคน)
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 mb-6 ${
          result.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          result.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-start gap-2">
            {result.type === 'success' && <CheckCircle size={20} />}
            {result.type === 'error' && <AlertCircle size={20} />}
            {result.type === 'info' && <Info size={20} />}
            <span>{result.message}</span>
          </div>
        </div>
      )}

      {/* Commands Reference */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">คำสั่งที่ผู้ใช้สามารถพิมพ์ใน LINE</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">สวัสดี / hello</span>
            <span className="text-slate-600">ทักทายและแสดงเมนู</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">สถานะรถ / status</span>
            <span className="text-slate-600">ดูสถานะรถทั้งหมด</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">gps / ตำแหน่ง</span>
            <span className="text-slate-600">ดูตำแหน่งรถล่าสุด</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="font-mono bg-slate-100 px-2 py-1 rounded">ช่วยเหลือ / help</span>
            <span className="text-slate-600">ดูคำสั่งทั้งหมด</span>
          </div>
        </div>
      </div>
    </div>
  );
}

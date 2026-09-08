import React, { useState } from 'react';

// "What is Memento Mori?" — collapsible philosophy explainer, written in Thai.
// Content verified against primary sources (see memento-mori-research.md).

const SECTIONS = [
  {
    title: 'คืออะไร',
    body: 'Memento Mori (เมเมนโต มอริ) เป็นภาษาลาติน แปลว่า "จงจำไว้ว่าเธอจะต้องตาย" — ไม่ใช่การหมกมุ่นกับความตาย แต่เป็นการฝึกการระลึกถึงความตายไว้เสมอ เพื่อช่วยให้เห็นว่าเวลาที่เหลืออยู่ควรใช้ยังไง',
  },
  {
    title: 'รากฐานทางปรัชญา',
    body: 'Memento Mori เป็นฝึกปฏิบัติหลักของปรัชญาสโตอิก (Stoicism) ที่สอนโดยมาร์คัส ออเรลิอุส (จักรพรรดิแห่งโรมัน) เซเนก้า และเอปิกเตตัส สโตอิกมองว่าความตายเป็น "indifferent" (สิ่งที่เป็นกลาง — ไม่ใช่สิ่งดีหรือเลว) จึงตัดรากฐานแห่งความกลัวออก วัตถุประสงค์คือการทำให้เห็นว่าอะไรสำคัญจริง ๆ ปลูกฝังความขอบคุณต่อปัจจุบัน และเพิ่มสมาธิกับสิ่งรอบตัว ผลลัพธ์จึงตรงข้ามกับความหมกมุ่น (morbid) อย่างสิ้นเชิง',
  },
  {
    title: 'ประวัติ',
    body: 'ที่มาที่เล่ากันมากสุดคือพิธี Triumph ของโรมัน: หลังชัยชนะครั้งใหญ่ ทาสหรือผู้ติดตามจะยืนอยู่หลังรถม้าของแม่ทัพ แล้วกระซิบเตือน "memento mori" (หรือ "จงจำไว้ว่าเจ้ายังเป็นมนุษย์") เพื่อไม่ให้เกียรติสูงสุดพาให้หลงลืมว่าทุกสิ่งย่อมมีวันจบ ภาพนี้ฝังลึกในวัฒนธรรมตะวันตก ตั้งแต่ยุคกลางจนถึงศิลปะ vanitas',
  },
  {
    title: 'ทำไมจึงช่วยให้ชีวิตดีขึ้น',
    body: 'งานวิจัยด้านจิตวิทยา (death awareness / mortality salience) พบว่า เมื่อคนมี "buffer" ที่แข็งแรง — ความหมายของชีวิต ความสัมพันธ์ และความภูมิใจในตัวเอง — การนึกถึงความตายจะเพิ่มความพึงพอใจในชีวิต ความขอบคุณ และช่วยจัดลำดับความสำคัญของสิ่งต่าง ๆ ใหม่ (ละทิ้งเรื่องเล็กน้อย) แต่คำเตือนที่สำคัญ: ถ้าไม่มี buffer เหล่านี้ การนึกถึงความตายอาจเพิ่มความวิตกกังวลแทน ฝึกนี้จึงได้ผลก็เพราะจับคู่กับ gratitude + meaning + presence ซึ่ง app นี้ช่วยสร้างผ่านการบันทึกความสุขรายวัน',
  },
];

const READS = [
  { name: 'Meditations — Marcus Aurelius', note: 'บท 2.11, 7.56, 12.1, 12.3' },
  { name: 'On the Shortness of Life — Seneca', note: 'ทั้งเล่มคือ memento mori' },
  { name: 'Letters to Lucilius — Seneca', note: 'จดหมาย 1, 49, 90, 95' },
  { name: 'Enchiridion — Epictetus', note: 'บท 1.2, 2.11' },
];

export default function PhilosophyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card philosophy-card">
      <button
        className="philosophy-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="philosophy-toggle-label">
          {open ? '▲' : '▼'} &nbsp;Memento Mori คืออะไร
        </span>
        <span className="philosophy-toggle-hint">{open ? 'ย่อ' : 'อ่าน'}</span>
      </button>

      {open && (
        <div className="philosophy-body">
          {SECTIONS.map((s) => (
            <div key={s.title} className="philosophy-section">
              <h4 className="philosophy-section-title">{s.title}</h4>
              <p className="philosophy-section-body">{s.body}</p>
            </div>
          ))}

          <div className="philosophy-section">
            <h4 className="philosophy-section-title">อ่านต่อ</h4>
            <ul className="philosophy-reads">
              {READS.map((r) => (
                <li key={r.name}>
                  <span className="philosophy-read-name">{r.name}</span>
                  <span className="philosophy-read-note">{r.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

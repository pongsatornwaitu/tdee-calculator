# TDEE Calculator (Müller Formula)

เว็บแอปคำนวณ BMR และ TDEE ด้วยสูตร Müller ที่ใช้ Lean Body Mass (LBM) และ Fat Mass (FM) พร้อมตั้งเป้าหมาย deficit/surplus และแบ่ง macronutrient (P/C/F)

**🚀 ลองใช้:** https://pongsatornwaitu.github.io/tdee-calculator/

## สูตรที่ใช้

```
BMR = (13.587 × LBM) + (9.613 × FM) + (198 × Sex) − (3.351 × Age) + 674
TDEE = BMR × Activity Factor
```

- Sex: ชาย = 1, หญิง = 0
- LBM = น้ำหนัก − FM
- FM = น้ำหนัก × (%ไขมัน / 100)

## Activity Factor

| ค่า | กิจกรรม |
|---|---|
| 1.2 | นั่งทำงาน ไม่ค่อยออกกำลัง |
| 1.375 | ออกกำลัง 1–3 วัน/สัปดาห์ |
| 1.55 | ออกกำลัง 3–5 วัน/สัปดาห์ |
| 1.725 | ออกกำลัง 6–7 วัน/สัปดาห์ |
| 1.9 | งานใช้แรงหนักมาก + ออกกำลัง |

## ฟีเจอร์

- 📊 คำนวณ LBM/FM อัตโนมัติจากน้ำหนัก + %ไขมัน
- 🎯 ตั้งเป้า Deficit / Maintain / Surplus (5–25%)
- 🥩 ปรับโปรตีน 1.2–3.0 g/kg พร้อมคำแนะนำ
- 🍚 4 macro presets (Balanced / Low-Carb / High-Carb / Custom)
- 🌗 รองรับ Light/Dark theme
- 📱 Responsive — ใช้บนมือถือได้

## วิธีรันบนเครื่อง

ดับเบิลคลิก `index.html` หรือใช้ Live Server ใน VS Code

## Stack

Vanilla HTML + CSS + JavaScript (ไม่มี build step ไม่มี dependencies)

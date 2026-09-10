# ရွှေကြယ်တံခွန် IT & Mobile - HR & Payroll Web App

ရွှေကြယ်တံခွန် IT & Mobile ဆိုင်အတွက် ဝန်ထမ်းစီမံခန့်ခွဲမှု၊ ရက်မှန်ကြေး၊ အချိန်ပို (OT)၊ အရောင်းကော်မရှင်၊ နုတ်ငွေများနှင့် လစာရှင်းတမ်း (Payslip) တွက်ချက်သည့် Web Application ဖြစ်ပါသည်။

---

## Vercel ပေါ်တွင် တင်နည်း (Deployment Guide for Vercel)

ဒီ Web App ကို Vercel ပေါ်တွင် အခမဲ့ (Free) အလွယ်တကူ တင်နိုင်ရန်အတွက် `vercel.json` ကို ပြင်ဆင်ထည့်သွင်းပေးထားပြီး ဖြစ်ပါသည်။

### နည်းလမ်း (၁) - GitHub နှင့် ချိတ်ဆက်တင်နည်း (အကြံပြုလိုသည့် နည်းလမ်း)

1. **GitHub သို့ ကုဒ်များတင်ပါ (Push to GitHub)**
   - သင်၏ GitHub Account ထဲတွင် Repository အသစ်တစ်ခု ဆောက်ပါ။
   - ဤ Project ဖိုင်များကို အဆိုပါ GitHub Repository ထဲသို့ Upload ပြုလုပ်ပါ (သို့မဟုတ် Git push လုပ်ပါ)။

2. **Vercel သို့ သွားပါ**
   - [vercel.com](https://vercel.com) သို့ သွား၍ သင်၏ GitHub Account ဖြင့် Login ဝင်ပါ။

3. **New Project ထည့်ပါ**
   - **"Add New..."** > **"Project"** ကို နှိပ်ပါ။
   - ခုနက တင်ထားသော GitHub Repository ကို ရွေးချယ်ပြီး **"Import"** ကို နှိပ်ပါ။

4. **Build Settings စစ်ဆေးပြီး Deploy လုပ်ပါ**
   - Framework Preset: **Vite** (အလိုအလျောက် ရွေးထားပြီးသားဖြစ်ပါမည်)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **"Deploy"** ခလုတ်ကို နှိပ်လိုက်ရုံဖြင့် ၁ မိနစ်အတွင်း တိုက်ရိုက်အသုံးပြုနိုင်မည့် Website Link (`.vercel.app`) ရရှိပါမည်။

---

### နည်းလမ်း (၂) - Vercel CLI ဖြင့် တိုက်ရိုက်တင်နည်း (Terminal မှ တင်နည်း)

မိမိကွန်ပျူတာထဲတွင် Node.js ရှိပါက Terminal (Command Prompt) မှ အောက်ပါ Command များကို ရိုက်၍ တိုက်ရိုက်တင်နိုင်ပါသည်-

```bash
# ၁။ Vercel CLI ကို ကွန်ပျူတာထဲ install လုပ်ပါ
npm install -g vercel

# ၂။ Vercel သို့ deploy လုပ်ပါ
vercel

# ၃။ Production သို့ တိုက်ရိုက်ထုတ်လွှင့်လိုပါက
vercel --prod
```

---

## Built With
- **React 19 + Vite 6**
- **Tailwind CSS v4**
- **Lucide React Icons**
- **Pyidaungsu & Padauk Font Support**

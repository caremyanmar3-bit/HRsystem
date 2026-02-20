// api/login.js
export default function handler(req, res) {
    // POST request ဖြစ်မှသာ အလုပ်လုပ်ရန် စစ်ဆေးခြင်း
    if (req.method === 'POST') {
        const { username, password } = req.body;

        // Frontend မှာ ရေးထားတဲ့ Password တွေကို Backend မှာ ပြောင်းစစ်ပါမယ်
        // (မှတ်ချက် - တကယ့်အပြင်မှာ Database နဲ့ ချိတ်ဆက်ပြီး စစ်ဆေးရပါမယ်)
        if (username === 'admin' && password === 'care@2026') {
            
            // မှန်ကန်ရင် Role နဲ့ Token (Fake) ပြန်ပို့ပေးမယ်
            res.status(200).json({ 
                success: true, 
                role: 'admin',
                token: 'dummy-secure-token-12345' 
            });

        } else if (username === 'guest' && password === '4321') {
            
            res.status(200).json({ 
                success: true, 
                role: 'viewer',
                token: 'dummy-secure-token-67890' 
            });

        } else {
            // မှားယွင်းနေရင် Error Message ပြန်ပို့မယ်
            res.status(401).json({ 
                success: false, 
                message: 'Invalid Username or Password!' 
            });
        }
    } else {
        // POST method မဟုတ်ရင် လက်မခံပါ
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}

import { useEffect, useState } from "react";
import "./App.css";
import { useTelegram } from "./useTelegram";

type SharedCard = {
  share_id: string;
  occasion: string;
  template: string;
  recipient: string;
  sender: string;
  message: string;
};

const occasions = [
  { id: "birthday", icon: "🎂", title: "تولد", subtitle: "یک روز خاص" },
  {
    id: "thanks",
    icon: "💌",
    title: "قدردانی",
    subtitle: "برای یک آدم ارزشمند",
  },
  { id: "success", icon: "✨", title: "موفقیت", subtitle: "تبریک یک دستاورد" },
  { id: "love", icon: "❤️", title: "محبت", subtitle: "حرفی از ته دل" },
];

const templates = [
  { id: "rose", name: "رز مخملی", className: "card-rose", decoration: "✳" },
  { id: "night", name: "شب جادویی", className: "card-night", decoration: "✦" },
  { id: "cream", name: "کاغذ خاطره", className: "card-cream", decoration: "❋" },
];

const defaultMessages: Record<string, string> = {
  birthday:
    "امیدوارم سال جدید زندگیت پر از اتفاق‌های قشنگ، لبخندهای واقعی و آرزوهای برآورده‌شده باشه. تولدت مبارک! ✨",
  thanks:
    "ممنونم که با بودنت دنیا رو قشنگ‌تر می‌کنی. بعضی آدم‌ها خودشون یه هدیه‌ان و تو یکی از اون‌هایی. 💛",
  success:
    "این موفقیت نتیجه تلاش و باور توئه. بهت افتخار می‌کنم و مطمئنم اتفاق‌های بزرگ‌تری در انتظارت هستن. ✨",
  love: "خواستم فقط یادت بندازم که بودنت چقدر ارزشمنده و حضورت چقدر می‌تونه روز آدم رو قشنگ‌تر کنه. ❤️",
};

function App() {
  const [occasion, setOccasion] = useState("birthday");
  const [template, setTemplate] = useState("rose");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState(defaultMessages.birthday);
  const [notice, setNotice] = useState("");

  const sharedCardId = new URLSearchParams(window.location.search).get("card");

  const [sharedCard, setSharedCard] = useState<SharedCard | null>(null);
  const [sharedCardLoading, setSharedCardLoading] = useState(
    Boolean(sharedCardId),
  );
  const [sharedCardError, setSharedCardError] = useState("");

  useEffect(() => {
    const shareId = new URLSearchParams(window.location.search).get("card");

    if (!shareId) return;

    let cancelled = false;

    async function loadCard() {

      try {
        const response = await fetch(
          `/api/cards?shareId=${encodeURIComponent(shareId!)}`,
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "دریافت کارت ناموفق بود.");
        }

        if (!cancelled) {
          setSharedCard(result.card);
        }
      } catch {
        if (!cancelled) {
          setSharedCardError(
            "این کارت پیدا نشد یا در دریافت آن مشکلی پیش آمد.",
          );
        }
      } finally {
        if (!cancelled) {
          setSharedCardLoading(false);
        }
      }
    }

    void loadCard();

    return () => {
      cancelled = true;
    };
  }, []);

  const { isTelegram, user } = useTelegram();

  const selectedOccasion = occasions.find((item) => item.id === occasion)!;
  const selectedTemplate = templates.find((item) => item.id === template)!;

  function chooseOccasion(id: string) {
    setOccasion(id);
    setMessage(defaultMessages[id]);
    setNotice("");
  }

  async function shareCard() {
    setNotice("");

    let cardUrl: string;

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          occasion,
          template,
          recipient: recipient.trim(),
          sender: sender.trim(),
          message: message.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || typeof result.shareId !== "string") {
        throw new Error(result.error || "ذخیره کارت ناموفق بود.");
      }

      cardUrl = `${window.location.origin}${window.location.pathname}?card=${encodeURIComponent(result.shareId)}`;
    } catch {
      setNotice("ذخیره کارت ناموفق بود. اتصال API و تنظیمات سرور را بررسی کن.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: "یک پیام زیبا از GiftNote",
          text: "یک کارت زیبا برات ساختم 💌",
          url: cardUrl,
        });

        setNotice("لینک اختصاصی کارت به اشتراک گذاشته شد.");
      } else {
        await navigator.clipboard.writeText(cardUrl);
        setNotice("لینک اختصاصی کارت کپی شد؛ حالا در تلگرام بفرستش.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setNotice(`کارت ذخیره شد. لینک آن: ${cardUrl}`);
        return;
      }

      try {
        await navigator.clipboard.writeText(cardUrl);
        setNotice("لینک اختصاصی کارت کپی شد.");
      } catch {
        setNotice(`کارت ذخیره شد. لینک آن: ${cardUrl}`);
      }
    }
  }

  if (sharedCardId) {
    if (sharedCardLoading) {
      return (
        <main className="app-shell" dir="rtl">
          <p role="status">در حال بازکردن کارت زیبای تو... 💌</p>
        </main>
      );
    }

    if (sharedCardError || !sharedCard) {
      return (
        <main className="app-shell" dir="rtl">
          <section className="preview-panel">
            <h2>کارت پیدا نشد</h2>
            <p>{sharedCardError || "این کارت در دسترس نیست."}</p>
            <a href="/">ساخت یک کارت جدید</a>
          </section>
        </main>
      );
    }

    const cardOccasion = occasions.find(
      (item) => item.id === sharedCard.occasion,
    );

    const cardTemplate = templates.find(
      (item) => item.id === sharedCard.template,
    );

    if (!cardOccasion || !cardTemplate) {
      return (
        <main className="app-shell" dir="rtl">
          <p>اطلاعات این کارت معتبر نیست.</p>
        </main>
      );
    }

    return (
      <main className="app-shell" dir="rtl">
        <header className="topbar">
          <a className="brand" href="/" aria-label="GiftNote صفحه اصلی">
            <span className="brand-mark">✳</span>
            gift<span className="brand-light">note</span>
          </a>
          <span className="topbar-label">یک حس خوب، در چند کلمه</span>
        </header>

        <section
          className="preview-panel"
          style={{
            maxWidth: "620px",
            width: "calc(100% - 32px)",
            margin: "40px auto",
          }}
        >
          <div className="preview-topline">
            <span>یک پیام برای تو</span>
            <span className="live-indicator">
              <i /> MADE WITH LOVE
            </span>
          </div>

          <div className="card-stage">
            <article className={`greeting-card ${cardTemplate.className}`}>
              <span className="card-decoration decoration-top">
                {cardTemplate.decoration}
              </span>

              <span className="card-kicker">A LITTLE SOMETHING FOR YOU</span>

              <div className="card-illustration" aria-hidden="true">
                {cardTemplate.id === "rose"
                  ? "🌹"
                  : cardTemplate.id === "night"
                    ? "🌙"
                    : "🌷"}
              </div>

              <span className="card-occasion">
                {cardOccasion.icon} {cardOccasion.title}
              </span>

              <h3>
                {sharedCard.recipient
                  ? `برای ${sharedCard.recipient} عزیز`
                  : "برای یک آدم دوست‌داشتنی"}
              </h3>

              <div className="card-divider">
                <span>✳</span>
              </div>

              <p className="card-message">{sharedCard.message}</p>

              <div className="card-signature">
                {sharedCard.sender || "با عشق و مهر"}
              </div>

              <span className="card-decoration decoration-bottom">
                {cardTemplate.decoration}
              </span>
            </article>
          </div>

          <p className="preview-hint">
            <span>✧</span> این کارت با عشق در GiftNote ساخته شده.
          </p>

          <a
            href="/"
            className="share-button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            <span>ساخت کارت خودم</span>
            <span className="share-icon">↗</span>
          </a>
        </section>

        <footer className="footer">
          <span className="footer-brand">
            gift<span>note</span> ✳
          </span>
          <span>ساخته‌شده برای لحظه‌هایی که مهمن.</span>
        </footer>
      </main>
    );
  }

  return (
    <main className="app-shell" dir="rtl">
      {isTelegram && (
        <p className="telegram-status">
          متصل به تلگرام{user?.first_name ? `، ${user.first_name}` : ""}
        </p>
      )}
      <header className="topbar">
        <a className="brand" href="#" aria-label="GiftNote صفحه اصلی">
          <span className="brand-mark">
            g<span>✳</span>
          </span>
          <span>
            gift<span className="brand-light">note</span>
          </span>
        </a>
        <span className="topbar-label">
          <span className="status-dot" /> یک حس خوب، در چند کلمه
        </span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A LITTLE NOTE, A LOT OF LOVE</span>
          <h1>
            بعضی حرف‌ها،
            <br />
            <span>باید گفته بشن.</span>
          </h1>
          <p>
            برای آدم‌های مهم زندگیت، یک پیام بساز.
            <br className="desktop-break" />
            ساده، شخصی و از ته دل.
          </p>
          <div className="hero-note">
            <span>✳</span> یک هدیه کوچک، برای یک احساس بزرگ
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-spark spark-one">✦</div>
          <div className="art-spark spark-two">✳</div>
          <div className="art-envelope">
            <div className="envelope-heart">♥</div>
          </div>
          <div className="art-tag">made with love</div>
        </div>
      </section>

      <section className="workspace">
        <div className="editor-panel">
          <div className="section-heading">
            <span className="step-number">۰۱</span>
            <div>
              <h2>حست رو انتخاب کن</h2>
              <p>می‌خوای چه حرفی رو به اشتراک بذاری؟</p>
            </div>
          </div>

          <div className="occasion-grid">
            {occasions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`occasion-option ${occasion === item.id ? "selected" : ""}`}
                onClick={() => chooseOccasion(item.id)}
                aria-pressed={occasion === item.id}
              >
                <span className="occasion-icon">{item.icon}</span>
                <span className="occasion-title">{item.title}</span>
                <span className="occasion-subtitle">{item.subtitle}</span>
                {occasion === item.id && (
                  <span className="option-check">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="section-heading second-heading">
            <span className="step-number">۰۲</span>
            <div>
              <h2>پیامت رو شخصی کن</h2>
              <p>چند کلمه از خودت، همه‌چیز رو خاص‌تر می‌کنه.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="recipient">این پیام برای کیه؟</label>
            <input
              id="recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="مثلاً سارا، بهترین دوست من..."
              maxLength={60}
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="message">متن پیام</label>
              <span>{message.length}/500</span>
            </div>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 500))}
              rows={5}
              maxLength={500}
              placeholder="حرف دلت رو اینجا بنویس..."
            />
            <button
              type="button"
              className="reset-message"
              onClick={() => setMessage(defaultMessages[occasion])}
            >
              ↺ بازگشت به متن پیشنهادی
            </button>
          </div>

          <div className="field">
            <label htmlFor="sender">از طرفِ (اختیاری)</label>
            <input
              id="sender"
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              placeholder="با مهر، ..."
              maxLength={60}
            />
          </div>

          <div className="section-heading second-heading">
            <span className="step-number">۰۳</span>
            <div>
              <h2>لباس پیامت رو انتخاب کن</h2>
              <p>کدوم حال‌وهوا بیشتر به حرفت میاد؟</p>
            </div>
          </div>

          <div className="template-list">
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`template-option ${template === item.id ? "selected" : ""}`}
                onClick={() => setTemplate(item.id)}
                aria-pressed={template === item.id}
              >
                <span className={`template-swatch ${item.className}`}>
                  {item.decoration}
                </span>
                <span>{item.name}</span>
                {template === item.id && (
                  <span className="template-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <aside className="preview-panel">
          <div className="preview-topline">
            <span>پیش‌نمایش زنده</span>
            <span className="live-indicator">
              <i /> LIVE
            </span>
          </div>

          <div className="card-stage">
            <article className={`greeting-card ${selectedTemplate.className}`}>
              <span className="card-decoration decoration-top">
                {selectedTemplate.decoration}
              </span>
              <span className="card-kicker">A LITTLE SOMETHING FOR YOU</span>
              <div className="card-illustration" aria-hidden="true">
                {selectedTemplate.id === "rose"
                  ? "🌹"
                  : selectedTemplate.id === "night"
                    ? "🌙"
                    : "🌷"}
              </div>
              <span className="card-occasion">
                {selectedOccasion.icon} {selectedOccasion.title}
              </span>
              <h3>
                {recipient.trim()
                  ? `برای ${recipient.trim()} عزیز`
                  : "برای یک آدم دوست‌داشتنی"}
              </h3>
              <div className="card-divider">
                <span>✳</span>
              </div>
              <p className="card-message">
                {message.trim() || "حرف قشنگت رو اینجا بنویس..."}
              </p>
              <div className="card-signature">
                {sender.trim() || "با عشق و مهر"}
              </div>
              <span className="card-decoration decoration-bottom">
                {selectedTemplate.decoration}
              </span>
            </article>
          </div>

          <p className="preview-hint">
            <span>✧</span> هر تغییری بدی، همین‌جا می‌بینیش.
          </p>

          <button
            type="button"
            className="share-button"
            onClick={shareCard}
            disabled={!message.trim()}
          >
            <span>ارسال پیام</span>
            <span className="share-icon">↗</span>
          </button>
          <p className="share-caption">
            پیام رو کپی کن یا با قابلیت اشتراک‌گذاری دستگاهت ارسالش کن.
          </p>

          {notice && (
            <div className="notice" role="status">
              <span>✓</span> {notice}
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="بستن"
              >
                ×
              </button>
            </div>
          )}
        </aside>
      </section>

      <footer className="footer">
        <span className="footer-brand">
          gift<span>note</span> ✳
        </span>
        <span>ساخته‌شده برای لحظه‌هایی که مهمن.</span>
        <span className="footer-version">A LITTLE GOOD THING · 01</span>
      </footer>
    </main>
  );
}

export default App;

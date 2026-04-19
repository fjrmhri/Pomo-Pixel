import "../../styles/Footer.css";

function Footer({ onShare, sessionCount = 0 }) {
  try {
    const links = [
      { label: "hero", href: "#hero" },
      { label: "timer", href: "#timer" },
      { label: "music", href: "#music" },
      { label: "footer", href: "#footer" },
    ];

    return (
      <footer className="Footer" id="footer">
        <span className="Footer__label">Aesthetic Pomodoro</span>
        <p className="Footer__p">
          Pomo Pixel is an aesthetic pomodoro timer with lofi music for focus
          and productivity.
        </p>
        <p className="Footer__p">Built with focus by Pomo Pixel</p>
        <p className="Footer__p">Sessions completed: {sessionCount}</p>
        <p className="Footer__p">
          <button type="button" className="Footer__share" onClick={onShare}>
            Share
          </button>
        </p>
        <p className="Footer__p">
          quick links:{" "}
          {links.map((link, i) => (
            <span key={link.href}>
              <a className="Footer__a" href={link.href}>
                {link.label}
              </a>
              {i < links.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </footer>
    );
  } catch (err) {
    console.error("Footer gagal dirender:", err);
    return <div className="Footer__error">Gagal memuat footer.</div>;
  }
}

export default Footer;

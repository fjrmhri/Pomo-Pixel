import "../../styles/Footer.css";

// Sederhana: menampilkan tautan referensi
function Footer() {
  try {
    const references = [
      { label: "countdowns", href: "https://www.countdowns.live/" },
      { label: "buildspace", href: "https://buildspace.so/home" },
    ];

    return (
      <div className="Footer">
        <p className="Footer__p">
          inspired by{" "}
          {references.map((ref, i) => (
            <span key={ref.href}>
              <a
                className="Footer__a"
                rel="noreferrer"
                target="_blank"
                href={ref.href}
              >
                {ref.label}
              </a>
              {i === 0 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    );
  } catch (err) {
    console.error("Footer gagal dirender:", err);
    return <div className="Footer__error">Gagal memuat footer.</div>;
  }
}

export default Footer;

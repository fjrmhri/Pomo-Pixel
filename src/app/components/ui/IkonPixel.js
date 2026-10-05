// Ikon pixel 10x10 (crispEdges) yang mengikuti warna teks (currentColor).
const BENTUK = {
  putar: "M2 1h2v8H2zM4 2h2v6H4zM6 3h2v4H6zM8 4h1v2H8z",
  jeda: "M2 1h2v8H2zM6 1h2v8H6z",
  sebelumnya: "M1 1h2v8H1zM3 4h1v2H3zM4 3h2v4H4zM6 2h2v6H6zM8 1h1v8H8z",
  berikutnya: "M1 1h1v8H1zM2 2h2v6H2zM4 3h2v4H4zM6 4h1v2H6zM7 1h2v8H7z",
  pengguna: "M4 0h2v1H4zM3 1h4v3H3zM4 4h2v1H4zM2 6h6v1H2zM1 7h8v3H1z",
};

export default function IkonPixel({ nama, ukuran = 12 }) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={BENTUK[nama]} />
    </svg>
  );
}

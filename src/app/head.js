// server-side metadata
export const metadata = {
  title: "Lofi Pamodoro",
  description: "Pamodoro Timer With Music",
};

export default function Head() {
  return (
    <>
      <meta name="description" content={metadata.description} />
      <title>{metadata.title}</title>
      {/* Anda bisa menambahkan lebih banyak meta tag di sini */}
    </>
  );
}

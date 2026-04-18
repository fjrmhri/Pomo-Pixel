import Login from "./Login";
import "../../styles/SettingsForm.css";

/**
 * Komponen untuk menampilkan form login gabungan (Google + GitHub)
 */
function LoginRegisterForm({ googleUser, githubUser }) {
  // If both providers connected, nothing to show (per spec)
  if (googleUser && githubUser) return null;

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      <Login googleUser={googleUser} githubUser={githubUser} />
    </div>
  );
}

export default LoginRegisterForm;

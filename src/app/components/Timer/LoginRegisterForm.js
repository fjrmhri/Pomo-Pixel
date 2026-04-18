import Login from "./Login";
import { useEffect, useRef, useState } from "react";
import "../../styles/SettingsForm.css";

/**
 * Komponen untuk menampilkan form login gabungan (Google + GitHub)
 */
function LoginRegisterForm({ googleUser, githubUser, onClose }) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const prevBothConnectedRef = useRef(false);

  useEffect(() => {
    const bothConnected = Boolean(googleUser && githubUser);
    const wasBothConnected = prevBothConnectedRef.current;

    if (bothConnected && !wasBothConnected) {
      setShowSuccessMessage(true);
      const timeoutId = setTimeout(() => {
        setShowSuccessMessage(false);
        onClose?.();
      }, 1200);
      prevBothConnectedRef.current = bothConnected;
      return () => clearTimeout(timeoutId);
    }

    if (!bothConnected && showSuccessMessage) {
      setShowSuccessMessage(false);
    }

    prevBothConnectedRef.current = bothConnected;
  }, [githubUser, googleUser, onClose, showSuccessMessage]);

  // If both providers connected, nothing to show (per spec)
  if (googleUser && githubUser && !showSuccessMessage) return null;

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      <Login
        googleUser={googleUser}
        githubUser={githubUser}
        showSuccessMessage={showSuccessMessage}
      />
    </div>
  );
}

export default LoginRegisterForm;

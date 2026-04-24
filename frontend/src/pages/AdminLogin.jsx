import { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", { username: email, password });
      localStorage.setItem("token", res.data.token);
      onLogin?.(res.data.user);
      navigate("/admin/dashboard");
    } catch {
      setError("Credenciales inválidas");
    }
  };

  return (
    <div className="min-h-screen bg-ayp flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-ayp mb-6">Login Admin</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-4 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="w-full border p-2 mb-6 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="bg-ayp text-white px-4 py-2 w-full rounded hover:bg-ayp-dark"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;

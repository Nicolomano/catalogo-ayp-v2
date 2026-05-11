const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "https://catalogoayp.vercel.app",
  "https://refrigeracionayp.com",
  "https://www.refrigeracionayp.com",
];

if (process.env.FRONTEND_URL) {
  const url = process.env.FRONTEND_URL.trim();
  if (!allowedOrigins.includes(url)) allowedOrigins.push(url);
}

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export default corsOptions;

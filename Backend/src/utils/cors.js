const corsOptions = {
  origin: [
    "https://catalogoayp.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

export default corsOptions;

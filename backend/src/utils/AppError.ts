class AppError extends Error {
  status: number;
  isOperational: boolean;

  constructor(status: number, message: string, isOperational = true) {
    super(message);
    this.status = status;
    this.isOperational = isOperational;
  }
}

export default AppError;

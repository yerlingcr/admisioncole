const LoadingSpinner = ({ size = "md", text = "Cargando..." }) => {
  const sizeClasses = {
    sm: "loading-sm",
    md: "loading-md", 
    lg: "loading-lg"
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-2">
      <span className={`loading loading-spinner ${sizeClasses[size] || sizeClasses.md}`}></span>
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  )
}

export default LoadingSpinner

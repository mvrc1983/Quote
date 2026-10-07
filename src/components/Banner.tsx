type BannerProps = {
  type: "ok" | "err";
  message: string;
  onClose: () => void;
};

export function Banner({ type, message, onClose }: BannerProps) {
  return (
    <div className={`banner banner-${type}`} role={type === "err" ? "alert" : "status"}>
      <p>{message}</p>
      <button type="button" className="banner-close" onClick={onClose} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

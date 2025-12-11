type ToastLike = {
  show: (
    msg: string,
    opts?: { type?: "success" | "error" | "info"; duration?: number },
  ) => void;
};

export async function copyWithToast(
  text: string,
  toast?: ToastLike,
  opts?: { success?: string; error?: string },
) {
  try {
    await navigator.clipboard.writeText(text);
    toast?.show(opts?.success ?? "복사 완료", { type: "success" });
  } catch (error) {
    toast?.show(opts?.error ?? `복사 실패: ${error}`, { type: "error" });
  }
}

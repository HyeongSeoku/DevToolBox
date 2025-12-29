import { useNavigate } from "react-router-dom";

import { ConvertPage } from "../Convert";

type ConvertGifPageProps = {
  recentAdd: (title: string, detail: string) => void;
};

export function ConvertGifPage({ recentAdd }: ConvertGifPageProps) {
  const navigate = useNavigate();

  return (
    <ConvertPage
      modeOverride="gif"
      onModeChange={(mode) => {
        navigate(mode === "gif" ? "/convert/gif" : "/convert/image");
      }}
      recentAdd={recentAdd}
    />
  );
}

import { useNavigate } from "react-router-dom";

import { ConvertPage } from "../Convert";

type ConvertImagePageProps = {
  recentAdd: (title: string, detail: string) => void;
};

export function ConvertImagePage({ recentAdd }: ConvertImagePageProps) {
  const navigate = useNavigate();

  return (
    <ConvertPage
      modeOverride="convert"
      onModeChange={(mode) => {
        navigate(mode === "gif" ? "/convert/gif" : "/convert/image");
      }}
      recentAdd={recentAdd}
    />
  );
}

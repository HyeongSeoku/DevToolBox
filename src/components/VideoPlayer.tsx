import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";

import { createPortal } from "react-dom";

import FullscreenIcon from "@/assets/icons/fullscreen.svg?react";
import FullscreenExitIcon from "@/assets/icons/fullscreen_exit.svg?react";
import PauseIcon from "@/assets/icons/pause.svg?react";
import PlayIcon from "@/assets/icons/play_arrow.svg?react";

import { Button } from "./ui/Button";
import styles from "./VideoPlayer.module.scss";

type VideoPlayerProps = {
  src: string;
  className?: string;
  videoClassName?: string;
} & Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "controls">;

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    { src, className, videoClassName, onPlay, onPause, onEnded, ...props },
    ref,
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const localRef = useRef<HTMLVideoElement | null>(null);

    const setRefs = (node: HTMLVideoElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleToggle = useCallback(async () => {
      const video = localRef.current;
      if (!video) return;
      if (video.paused) {
        try {
          await video.play();
          setIsPlaying(true);
        } catch {
          // ignore autoplay restrictions
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }, []);

    const handleFullscreenToggle = useCallback(async () => {
      const container = containerRef.current;
      const video = localRef.current;
      if (!container) return;

      if (isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
        return;
      }

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
          return;
        } catch {
          // ignore
        }
      }

      try {
        if (video?.requestFullscreen) {
          await video.requestFullscreen();
          if (document.fullscreenElement) return;
        }
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          if (document.fullscreenElement) return;
        }
      } catch {
        // fallback to pseudo fullscreen
      }

      setIsPseudoFullscreen(true);
    }, [isPseudoFullscreen]);

    useEffect(() => {
      const handleChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener("fullscreenchange", handleChange);
      return () =>
        document.removeEventListener("fullscreenchange", handleChange);
    }, []);

    useEffect(() => {
      if (!isPseudoFullscreen) return;
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsPseudoFullscreen(false);
        }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [isPseudoFullscreen]);

    useEffect(() => {
      setIsPlaying(false);
    }, [src]);

    const playerContent = (
      <div
        ref={containerRef}
        className={`${styles.player} ${className ?? ""} ${
          isPseudoFullscreen ? styles.pseudoFullscreen : ""
        }`}
      >
        <video
          ref={setRefs}
          className={`${styles.video} ${videoClassName ?? ""}`}
          src={src}
          controls={false}
          onClick={handleToggle}
          onPlay={(event) => {
            setIsPlaying(true);
            onPlay?.(event);
          }}
          onPause={(event) => {
            setIsPlaying(false);
            onPause?.(event);
          }}
          onEnded={(event) => {
            setIsPlaying(false);
            onEnded?.(event);
          }}
          {...props}
        />
        {isPlaying && (
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleToggle}
            aria-label="일시정지"
          >
            <PauseIcon />
          </button>
        )}
        {!isPlaying && (
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleToggle}
            aria-label="재생"
          >
            <PlayIcon />
          </button>
        )}
        <Button
          variant="ghost"
          type="button"
          className={styles.fullscreenButton}
          onClick={handleFullscreenToggle}
          aria-label={
            isFullscreen || isPseudoFullscreen ? "전체화면 종료" : "전체화면"
          }
        >
          {isFullscreen || isPseudoFullscreen ? (
            <FullscreenExitIcon />
          ) : (
            <FullscreenIcon />
          )}
        </Button>
      </div>
    );

    if (isPseudoFullscreen) {
      return createPortal(playerContent, document.body);
    }

    return playerContent;
  },
);

VideoPlayer.displayName = "VideoPlayer";

/* oxlint-disable next/no-img-element -- This image is generated locally for saving. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable image preview needs keyboard focus. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHydrated } from '@/hooks/use-hydrated';
import ArrowIcon from './ArrowIcon';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  createInvitationImage,
  invitationImageName,
} from '@/lib/invitation-image';

type Device = 'ios' | 'android' | 'wechat' | 'desktop';

function currentDevice(): Device {
  if (/MicroMessenger/i.test(navigator.userAgent)) return 'wechat';
  if (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
    return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

export default function SaveInvitationImage() {
  const ready = useHydrated();
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const imageUrl = useRef('');
  const labelFocusGuards = useCallback((popup: HTMLDivElement | null) => {
    if (!popup) return;
    queueMicrotask(() =>
      popup.parentElement
        ?.querySelectorAll('[data-base-ui-focus-guard]')
        .forEach((guard, index) => {
          guard.setAttribute(
            'aria-label',
            index === 0
              ? '返回图片保存的最后一个操作'
              : '返回图片保存的第一个操作',
          );
        }),
    );
  }, []);

  useEffect(() => {
    if (!open || file) return;
    let active = true;
    createInvitationImage()
      .then((image) => {
        if (!active) return;
        imageUrl.current = URL.createObjectURL(image);
        setUrl(imageUrl.current);
        setFile(image);
        setCanShare(
          device !== 'desktop' &&
            device !== 'wechat' &&
            !!navigator.share &&
            !!navigator.canShare?.({ files: [image] }),
        );
      })
      .catch(() => {
        if (active) setFeedback('图片暂未准备好，请收起后再试一次。');
      });
    return () => {
      active = false;
    };
  }, [open, file, device]);

  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl.current);
  }, []);

  async function shareImage() {
    if (!file || sharing) return;
    setSharing(true);
    setFeedback('');
    try {
      // The file is prepared before this tap, preserving mobile user activation.
      await navigator.share({ files: [file] });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setFeedback('也可以长按图片保存，或使用下方“下载图片”。');
      }
    } finally {
      setSharing(false);
    }
  }

  const hint =
    device === 'ios'
      ? '长按图片保存，或在系统菜单中选择“存储图像”。'
      : device === 'android' || device === 'wechat'
        ? '长按图片，选择“保存图片”；也可以直接下载。'
        : '下载这张邀请，把相聚的时间和地点留在手边。';

  return (
    <>
      <button
        className="button button-red"
        ref={trigger}
        disabled={!ready}
        onClick={() => {
          setDevice(currentDevice());
          setFeedback('');
          setOpen(true);
        }}
      >
        保存为图片{' '}
        <span aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={labelFocusGuards}
          className="image-save-dialog"
          finalFocus={trigger}
          showCloseButton={false}
        >
          <header className="image-save-header">
            <DialogTitle>把邀请，留在手边。</DialogTitle>
            <DialogClose aria-label="收起邀请图片">×</DialogClose>
          </header>
          <section
            className="image-save-scroll"
            tabIndex={0}
            aria-label="邀请图片预览，可滚动或长按保存"
          >
            {url ? (
              <img
                className="invitation-image"
                src={url}
                alt="汪家喆与朱敏诚挚敬邀，2026年10月3日，17:28到场相聚，黄山市歙县徽苑一楼，2号厅晚宴"
                width="1080"
                height="1620"
              />
            ) : (
              <output>正在写好这份邀请…</output>
            )}
          </section>
          <div className="image-save-actions" data-device={device}>
            <DialogDescription>{hint}</DialogDescription>
            {canShare && (
              <button
                className="button button-red"
                onClick={shareImage}
                disabled={sharing || !url}
              >
                {sharing ? '正在打开…' : '打开系统保存菜单'}
                <span aria-hidden="true">
                  <ArrowIcon />
                </span>
              </button>
            )}
            {url && (
              <a
                className={`button ${canShare ? 'button-line' : 'button-red'}`}
                href={url}
                download={invitationImageName}
                onClick={() =>
                  setFeedback(
                    device === 'ios'
                      ? '若出现图片预览，可长按保存到相册。'
                      : '可在浏览器的下载记录中查看图片。',
                  )
                }
              >
                下载图片{' '}
                <span aria-hidden="true">
                  <ArrowIcon direction="down" />
                </span>
              </a>
            )}
            <output className="image-save-feedback">{feedback}</output>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

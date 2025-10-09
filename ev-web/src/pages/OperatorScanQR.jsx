import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { scanQr, finalizeBooking } from "../services/bookings";
import toast from "react-hot-toast";

export default function OperatorScanQR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState(null); // { bookingId, nic, stationId, date, start, end, status }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // try to auto-start on desktop localhost
    startCamera().catch(() => {});
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);
    setScanning(false);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", true);
        await videoRef.current.play();
        setScanning(true);
        tick(); // begin scanning loop
      }
    } catch (e) {
      console.error(e);
      setError("Camera unavailable. Use Upload or Manual token.");
      setCameraReady(false);
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setScanning(false);
  }

  function tick() {
    rafRef.current = requestAnimationFrame(tick);
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code && code.data) onTokenDetected(code.data.trim());
  }

  async function onTokenDetected(token) {
    if (!token) return;
    // pause scan to avoid double fires
    const wasScanning = scanning;
    if (wasScanning) setScanning(false);

    try {
      setBusy(true);
      const res = await scanQr(token);
      setResult(res);
      toast.success("QR verified");
    } catch (e) {
      console.error(e);
      toast.error("QR verification failed");
      // resume only if we paused due to camera
      if (wasScanning) setScanning(true);
    } finally {
      setBusy(false);
    }
  }

  async function verifyManual() {
    if (!manual.trim()) return toast.error("Enter a QR token");
    await onTokenDetected(manual.trim());
  }

  async function completeBooking() {
    if (!result?.bookingId) return;
    try {
      setBusy(true);
      await finalizeBooking(result.bookingId);
      toast.success("Session finalized");
      setResult((r) => r && { ...r, status: "Completed" });
    } catch (e) {
      console.error(e);
      toast.error("Finalize failed");
    } finally {
      setBusy(false);
    }
  }

  function scanAgain() {
    setResult(null);
    setManual("");
    if (cameraReady) setScanning(true);
  }

  // Decode QR from uploaded image
  async function onImageUpload(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);
      if (code && code.data) {
        onTokenDetected(code.data.trim());
      } else {
        toast.error("No QR found in image");
      }
    };
    img.onerror = () => toast.error("Invalid image");
    img.src = URL.createObjectURL(file);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scan / Verify Booking QR</h1>
          <p className="text-slate-500 text-sm">
            Use camera scan, upload a QR image, or paste token manually.
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {scanning ? "Scanning…" : result ? "Result ready" : error ? "Manual/Upload mode" : ""}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Camera */}
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm font-medium mb-2">Camera</div>
          {cameraReady ? (
            <>
              <video ref={videoRef} className="w-full rounded-lg bg-black/10" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-3 flex items-center gap-2">
                {!scanning ? (
                  <button onClick={() => setScanning(true)} className="px-3 py-2 rounded border hover:bg-slate-50">
                    Resume
                  </button>
                ) : (
                  <button onClick={() => setScanning(false)} className="px-3 py-2 rounded border hover:bg-slate-50">
                    Pause
                  </button>
                )}
                <button onClick={startCamera} className="px-3 py-2 rounded border hover:bg-slate-50">
                  Restart Camera
                </button>
                <button onClick={stopCamera} className="px-3 py-2 rounded border hover:bg-slate-50">
                  Stop
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-rose-600 text-sm">{error || "Camera not started."}</div>
              <button onClick={startCamera} className="px-3 py-2 rounded border hover:bg-slate-50">
                Try Start Camera
              </button>
            </div>
          )}
        </div>

        {/* Upload & Manual */}
        <div className="bg-white border rounded-2xl p-4 space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Upload QR Image</div>
            <input type="file" accept="image/*" onChange={onImageUpload} />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Manual Token</div>
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Paste QR token here"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button
                onClick={verifyManual}
                disabled={busy}
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Verify
              </button>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="text-sm font-medium mb-2">Verification Result</div>
            {!result ? (
              <div className="text-slate-500 text-sm">No result yet.</div>
            ) : (
              <div className="rounded-xl border p-3">
                <Row label="Booking ID" value={result.bookingId} />
                <Row label="Owner NIC" value={result.nic} />
                <Row label="Station" value={result.stationId} />
                <Row label="Date" value={result.date} />
                <Row label="Time" value={`${result.start} – ${result.end}`} />
                <Row label="Status" value={result.status} />
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={scanAgain} className="px-3 py-2 rounded border hover:bg-slate-50">
                    Scan again
                  </button>
                  {result.status === "Approved" && (
                    <button
                      onClick={completeBooking}
                      disabled={busy}
                      className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Finalize
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div className="text-slate-500">{label}</div>
      <div className="font-medium break-all">{value ?? "—"}</div>
    </div>
  );
}

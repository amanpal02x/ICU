import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Camera, X, CheckCircle } from "lucide-react";
import Header from "@/components/Header";

const UploadPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [age, setAge] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadComplete(false);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadComplete(false);
    }
  };

const handleUpload = async () => {
    if (!selectedImage || !age.trim()) return;

    setIsUploading(true);

    try {
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('patient_age', age);

      // Call the disease prediction API using environment variable
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
      const response = await fetch(`${API_BASE_URL}/api/disease-predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Navigate to result page with real API data
      navigate('/wound-result', {
        state: {
          image: selectedImage,
          age: parseInt(age),
          predictionResult: result,
          isAnalyzing: false
        }
      });

    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      // You could add error handling UI here
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadComplete(false);
    setAge("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const startCamera = async () => {
    try {
      // Use basic video constraints that work on most browsers
      const constraints = { video: true };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Camera access denied or not available. Please check your browser permissions and ensure you\'re using HTTPS.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setUploadComplete(false);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-6 py-8 pt-24">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Upload Wound Image</h1>
            <p className="text-muted-foreground">
              Capture or upload an image of the wound for analysis
            </p>
          </div>

          {/* Upload Button */}
          <div className="text-center mb-8">
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="px-8 py-4 text-lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Image
            </Button>
          </div>

          {/* Upload Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Choose Image Source</DialogTitle>
                <DialogDescription>
                  Select how you want to add an image for wound analysis
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4">
                <Button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsDialogOpen(false);
                  }}
                  variant="outline"
                  className="flex items-center justify-center gap-3 h-16"
                >
                  <Upload className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-medium">Choose from Device</div>
                    <div className="text-sm text-muted-foreground">Select from gallery</div>
                  </div>
                </Button>
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="flex items-center justify-center gap-3 h-16"
                >
                  <Camera className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-medium">Take from Camera</div>
                    <div className="text-sm text-muted-foreground">Capture new photo</div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Camera Dialog */}
          <Dialog open={isCameraOpen} onOpenChange={(open) => {
            if (!open) stopCamera();
          }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Take Photo</DialogTitle>
                <DialogDescription>
                  Position your camera and capture the wound image
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={captureImage}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture
            onChange={handleCameraCapture}
            className="hidden"
          />

          {/* Selected File Info */}
          {selectedImage && (
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">Selected:</span> {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium">
                    Patient Age <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter patient age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="1"
                    max="120"
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !age.trim()}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Analyze Wound
                      </>
                    )}
                  </Button>
                </div>


              </CardContent>
            </Card>
          )}


        </div>
      </div>
    </div>
  );
};

export default UploadPage;

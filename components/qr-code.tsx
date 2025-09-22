"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Download, Copy } from "lucide-react";

interface QRCodeComponentProps {
    pollId: string;
    pollTitle: string;
    className?: string;
}

export function QRCodeComponent({ pollId, pollTitle, className = "" }: QRCodeComponentProps) {
    const [qrCodeData, setQrCodeData] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pollUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/polls/${pollId}`;

    useEffect(() => {
        const generateQRCode = async () => {
            try {
                setLoading(true);
                const qrData = await QRCode.toDataURL(pollUrl, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                setQrCodeData(qrData);
            } catch (err) {
                setError("Failed to generate QR code");
                console.error("QR Code generation error:", err);
            } finally {
                setLoading(false);
            }
        };

        generateQRCode();
    }, [pollUrl]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: pollTitle,
                    text: `Check out this poll: ${pollTitle}`,
                    url: pollUrl,
                });
            } catch (err) {
                console.error("Share failed:", err);
                // Fallback to copy to clipboard
                copyToClipboard();
            }
        } else {
            copyToClipboard();
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(pollUrl);
            // You could add a toast notification here
            alert("Poll link copied to clipboard!");
        } catch (err) {
            console.error("Copy failed:", err);
            alert("Failed to copy link to clipboard");
        }
    };

    const downloadQRCode = () => {
        const link = document.createElement('a');
        link.download = `poll-${pollId}-qr.png`;
        link.href = qrCodeData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card className={`w-full max-w-sm mx-auto ${className}`}>
            <CardHeader className="text-center">
                <CardTitle className="text-lg">📱 Share Poll</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Scan QR code or share link to vote
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* QR Code Display */}
                <div className="flex justify-center">
                    {loading ? (
                        <div className="w-64 h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                            <div className="text-muted-foreground">Generating QR Code...</div>
                        </div>
                    ) : error ? (
                        <div className="w-64 h-64 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center">
                            <div className="text-red-600 dark:text-red-400 text-center p-4">
                                <div className="text-sm">{error}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <img
                                src={qrCodeData}
                                alt={`QR Code for poll: ${pollTitle}`}
                                className="w-64 h-64"
                            />
                        </div>
                    )}
                </div>

                {/* Poll Title */}
                <div className="text-center">
                    <h3 className="font-semibold text-sm truncate">{pollTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-1 break-all">{pollUrl}</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                    <Button
                        onClick={handleShare}
                        className="w-full"
                        variant="default"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Poll
                    </Button>

                    <div className="flex gap-2">
                        <Button
                            onClick={copyToClipboard}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                        </Button>
                        <Button
                            onClick={downloadQRCode}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={!qrCodeData}
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Download QR
                        </Button>
                    </div>
                </div>

                {/* Mobile Tip */}
                <div className="text-center text-xs text-muted-foreground">
                    💡 Tip: On mobile, tap "Share" to send via messaging apps
                </div>
            </CardContent>
        </Card>
    );
}

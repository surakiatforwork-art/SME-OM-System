import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container-page grid min-h-screen place-items-center py-8">
        <div className="surface max-w-lg p-6 text-center">
          <h1 className="text-2xl font-extrabold text-cocoa-900">
            หน้านี้โหลดไม่สำเร็จ
          </h1>
          <p className="mt-3 text-sm leading-6 text-cocoa-600">
            กรุณารีเฟรชหน้าอีกครั้ง หากยังพบปัญหาให้ล้างข้อมูลเว็บไซต์หรือลองเข้าสู่ระบบใหม่
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.location.reload()}>รีเฟรช</Button>
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.removeItem("sme-om-admin-session");
                window.location.hash = "#/admin/login";
                window.location.reload();
              }}
            >
              กลับหน้า Login
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

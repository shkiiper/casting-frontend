import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App crashed with an uncaught render error", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f6fa] px-4 py-12 text-slate-900">
          <div className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
              Onset
            </div>
            <h1 className="text-2xl font-bold">Страница временно не загрузилась</h1>
            <p className="text-sm leading-6 text-slate-600">
              Попробуйте обновить страницу. Если проблема повторится, мы уже записали
              ошибку в консоль браузера для диагностики.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

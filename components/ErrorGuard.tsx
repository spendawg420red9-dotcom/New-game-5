import React from 'react';

// Catches a crash inside whatever it wraps so one bad model / texture can never blank the whole game.
// It quietly remounts the children up to `retries` times; after that it shows a small message with buttons.
interface Props { children: React.ReactNode; retries?: number; label?: string; onGiveUp?: () => void; }
interface State { err: Error | null; tries: number; key: number; }

export class ErrorGuard extends React.Component<Props, State> {
  state: State = { err: null, tries: 0, key: 0 };
  static getDerivedStateFromError(err: Error): Partial<State> { return { err }; }
  componentDidCatch(err: Error) {
    console.error('[ErrorGuard]', this.props.label || '', err);
    const max = this.props.retries ?? 2;
    if (this.state.tries < max) {
      setTimeout(() => this.setState(s => ({ err: null, tries: s.tries + 1, key: s.key + 1 })), 250);
    }
  }
  render() {
    const max = this.props.retries ?? 2;
    if (this.state.err && this.state.tries >= max) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000d', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>The game hit a problem{this.props.label ? ` (${this.props.label})` : ''}</div>
          <div style={{ fontSize: 12, opacity: 0.7, maxWidth: 360 }}>Your saved guns, skins, maps and models are safe. A model or picture that is too heavy for this device is the usual cause - try removing the last thing you added.</div>
          <button onClick={() => this.setState({ err: null, tries: 0, key: this.state.key + 1 })} style={{ padding: '10px 18px', background: '#d97706', color: '#fff', fontWeight: 900, border: 0 }}>TRY AGAIN</button>
          <button onClick={() => { if (this.props.onGiveUp) this.props.onGiveUp(); else window.location.reload(); }} style={{ padding: '10px 18px', background: '#333', color: '#fff', fontWeight: 900, border: 0 }}>{this.props.onGiveUp ? 'BACK TO MENU' : 'RELOAD GAME'}</button>
        </div>
      );
    }
    if (this.state.err) return null;
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}

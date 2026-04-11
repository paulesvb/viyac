/**
 * Minimal MusicKit JS v3 surface for the Apple Music demo.
 * @see https://js-cdn.music.apple.com/musickit/v3/docs/
 */

export {};

declare global {
  interface Window {
    MusicKit?: MusicKitStatic;
  }

  interface MusicKitStatic {
    configure(configuration: MusicKitConfiguration): Promise<MusicKitInstance>;
    getInstance(): MusicKitInstance;
  }

  interface MusicKitConfiguration {
    developerToken: string;
    app: {
      name: string;
      build: string;
    };
    storefrontId?: string;
    debug?: boolean;
  }

  interface MusicKitInstance {
    readonly isAuthorized: boolean;
    authorize(): Promise<string>;
    setQueue(options: { song?: string; songs?: string[] }): Promise<unknown>;
    play(): Promise<void>;
  }
}

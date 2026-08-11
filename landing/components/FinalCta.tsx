import WaitlistForm from "./WaitlistForm";
import AppStoreBadge from "./AppStoreBadge";

const FinalCta = () => {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 100%, rgba(42,75,255,0.22), transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-32 text-center md:px-10">
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Be first through the door
        </h2>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Dryve is putting the finishing touches on the App Store release.
          Join the waitlist and we&apos;ll email you the moment it&apos;s
          live.
        </p>
        <div className="mt-10 flex w-full flex-col items-center gap-6">
          <WaitlistForm />
          <AppStoreBadge />
        </div>
      </div>
    </section>
  );
};

export default FinalCta;

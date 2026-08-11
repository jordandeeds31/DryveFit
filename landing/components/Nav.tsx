import Image from "next/image";

const Nav = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <Image
            src="/dryve-icon.png"
            alt=""
            width={30}
            height={30}
            className="rounded-[8px]"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Dryve
          </span>
        </div>
        <a
          href="#waitlist"
          className="rounded-full border border-border bg-white/[0.04] px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-white/[0.09]"
        >
          Get early access
        </a>
      </div>
    </header>
  );
};

export default Nav;

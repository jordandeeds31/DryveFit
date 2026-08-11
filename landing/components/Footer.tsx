import Image from "next/image";

const Footer = () => {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted md:flex-row md:px-10">
        <div className="flex items-center gap-2">
          <Image
            src="/dryve-icon.png"
            alt=""
            width={20}
            height={20}
            className="rounded-[5px] opacity-80"
          />
          <span>Dryve</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://fitness-vioh.onrender.com/privacy" className="transition hover:text-foreground">
            Privacy
          </a>
          <a href="https://fitness-vioh.onrender.com/support" className="transition hover:text-foreground">
            Support
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} Dryve</p>
      </div>
    </footer>
  );
};

export default Footer;

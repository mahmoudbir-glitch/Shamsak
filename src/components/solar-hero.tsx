import Image from 'next/image';

export function SolarHero() {
  return (
    <div className="w-full">
      <div className="px-3 pb-3 sm:px-6">
        <Image
          src="/images/1001085146.jpg"
          alt="الشمسية والشبكة والمنزل والبطارية"
          width={1600}
          height={900}
          priority
          className="w-full h-auto rounded-lg"
        />
      </div>
    </div>
  );
}

export default SolarHero;

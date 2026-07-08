import SmoothScroll from "@/components/SmoothScroll";
import Rotate from "@/components/Rotate";
import Nav from "@/components/Nav";
import IndexGallery from "@/components/IndexGallery";
import Hero from "@/components/Hero";
import Awards from "@/components/Awards";
import Artisan from "@/components/Artisan";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Rotate />
      <main className="app" id="top">
        <Nav />
        <div className="main">
          <IndexGallery />
          <Hero />
          <Awards />
          <Artisan />
          <Testimonials />
        </div>
        <Footer />
      </main>
    </SmoothScroll>
  );
}

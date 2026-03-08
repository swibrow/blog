import { Routes, Route } from "react-router-dom";
import Header from "@components/layout/Header";
import Footer from "@components/layout/Footer";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Posts from "@/pages/Posts";
import PostDetail from "@/pages/PostDetail";
import TIL from "@/pages/TIL";
import Projects from "@/pages/Projects";
import Tools from "@/pages/Tools";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:slug" element={<PostDetail />} />
        <Route path="/til" element={<TIL />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}

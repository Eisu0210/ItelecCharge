import { useParams, Navigate } from "react-router-dom";
import { findLandingBySlug } from "../content/seoLandings";
import { SeoLandingPageView } from "./SeoLandingPage";

export function SeoLandingRoute() {
  const { slug } = useParams<{ slug: string }>();
  const page = findLandingBySlug(slug);
  if (!page) return <Navigate to="/" replace />;
  return <SeoLandingPageView page={page} />;
}

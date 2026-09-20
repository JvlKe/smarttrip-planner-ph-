import PageHeader from "../components/PageHeader";
import StaticTravelMap from "../components/StaticTravelMap";

export default function MapPreview() {
  return <><PageHeader title="Travel Map" subtitle="Explore the Philippines" /><div className="page map-preview-page"><StaticTravelMap /></div></>;
}

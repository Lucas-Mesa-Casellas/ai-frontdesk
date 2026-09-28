// Shown the moment a dashboard link is clicked, while the page's data loads.
// It also lets Next.js prefetch the dashboard shell for every sidebar link,
// so moving between pages answers instantly instead of waiting on the server.
// Only neutral placeholder blocks: no text, no numbers.
export default function DashboardLoading() {
  return (
    <div className="ui-page dash-skel" aria-busy="true">
      <div className="dash-skel-title" />
      <div className="dash-skel-lede" />
      <div className="dash-skel-row">
        <div className="dash-skel-block" />
        <div className="dash-skel-block" />
        <div className="dash-skel-block" />
      </div>
      <div className="dash-skel-block dash-skel-big" />
    </div>
  );
}

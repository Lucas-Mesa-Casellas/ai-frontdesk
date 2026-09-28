// Opening a call from the list shows this straight away while the call loads
// (the same layout as the call page: the record on the left, facts on the right).
export default function CallLoading() {
  return (
    <div className="ui-page dash-skel" aria-busy="true" style={{ maxWidth: 1180 }}>
      <div className="dash-skel-lede" style={{ width: 70, marginBottom: 22 }} />
      <div className="dash-skel-split">
        <div className="dash-skel-block dash-skel-big" />
        <div className="dash-skel-block" style={{ height: 300 }} />
      </div>
    </div>
  );
}

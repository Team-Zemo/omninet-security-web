function Dashboard() {
  const loremText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
  const repeatedLorem = Array(30).fill(loremText).join(" ");
  // console.log(a);
  return (
    <div>
      <h1>Dashboard</h1>
      <p>{repeatedLorem}</p>
    </div>
  );
}

export default Dashboard;
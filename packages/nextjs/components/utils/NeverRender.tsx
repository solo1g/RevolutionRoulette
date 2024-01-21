const NeverRender = () => {
  console.error("Should never render");
  return <>NEVER RENDER</>;
};

export default NeverRender;

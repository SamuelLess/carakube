import { NextResponse } from "next/server";

const EXTERNAL_API_URL = "http://operator:8000/api/graph";

export const GET = async () => {
  //return NextResponse.json(file);
  try {
    const response = await fetch(EXTERNAL_API_URL);

    if (!response.ok) {
      // If the external API call was not successful, propagate its status and message
      return new NextResponse(response.statusText, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching data from external API:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

import { NextResponse } from "next/server";

const EXTERNAL_API_URL = "http://operator:8000/api/graph";

export const GET = async () => {
  //return NextResponse.json(file);
  try {
    const response = await fetch(EXTERNAL_API_URL);

    if (!response.ok) {
      // If the external API call was not successful, return a JSON error response
      return NextResponse.json(
        { status: "error", message: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching data from external API:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to connect to backend service" },
      { status: 500 }
    );
  }
};

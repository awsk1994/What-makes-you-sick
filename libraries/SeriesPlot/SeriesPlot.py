'''

Input: data, output, title (optional), y_label (optional)
 - data: [(<YYYY-MM-DD hh:mm:ss>, <dist>), ...]

Output: outputs the graph to 'output' (from input parameter)
'''

import datetime as dt
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

class SeriesPlot:
	def __init__(self, data, output, title, y_label):
		self.data = data
		self.output = output
		self.title = title
		self.y_label = y_label

	def plot(self, show_graph = False):
		fig, ax = plt.subplots()

		ax.plot(self.data.index, self.data.values, color='black', linewidth=0.4)
		ax.xaxis.set_major_locator(mdates.HourLocator(interval=24))
		ax.xaxis.set_major_formatter(mdates.DateFormatter('%B-%d'))
		fig.autofmt_xdate()

		if self.title is not None:
			ax.title.set_text(self.title)

		if self.y_label is not None:
			ax.set_ylabel(self.y_label)

		plt.savefig(self.output)

		if show_graph:
			plt.show()

def test():
	x_axis = pd.date_range('2017-01-01 00:00', '2017-01-10 11:59', freq='H')
	data = pd.Series(np.random.randn(len(x_axis)), index=x_axis)
	output_path = "img/gaussian_{}.jpg".format(dt.datetime.now())

	SeriesPlot(data, output_path, "Time Series Chart for Gunshots", "Gunshots").plot(show_graph = True)

if __name__ == "__main__":
	test() #
